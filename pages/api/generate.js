// Taxonomy codes for primary care specialties
const TAXONOMY_CODES = {
  'primary care and family medicine': ['207Q00000X', '207QA0505X', '207QA0000X'],
  'independent primary care practices': ['207Q00000X', '207QA0505X'],
  'federally qualified health centers FQHCs': ['261QF0400X'],
  'rural health clinics': ['261QR1300X'],
  'internal medicine clinics': ['207R00000X', '207RI0200X'],
}

async function fetchNPIProviders(city, state, taxonomyCodes, limit) {
  const stateAbbr = state.trim().length === 2
    ? state.trim().toUpperCase()
    : STATE_MAP[state.trim().toLowerCase()] || state.trim().toUpperCase()

  const results = []

  for (const code of taxonomyCodes) {
    if (results.length >= limit) break
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&city=${encodeURIComponent(city)}&state=${stateAbbr}&taxonomy_description=&limit=20&skip=0`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      if (data.results) results.push(...data.results)
    } catch (_) {}
  }

  // Also try a broader search by city+state for org type NPI-2
  if (results.length < limit) {
    try {
      const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&city=${encodeURIComponent(city)}&state=${stateAbbr}&limit=25&skip=0`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.results) results.push(...data.results)
      }
    } catch (_) {}
  }

  // Deduplicate by NPI number
  const seen = new Set()
  return results.filter(r => {
    if (seen.has(r.number)) return false
    seen.add(r.number)
    return true
  }).slice(0, limit * 3) // get extra so Claude can pick the best
}

function extractPracticeInfo(npiResult) {
  const basic = npiResult.basic || {}
  const addresses = npiResult.addresses || []
  const taxonomies = npiResult.taxonomies || []

  // Prefer practice location address
  const addr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {}

  const name = basic.organization_name || basic.name ||
    `${basic.first_name || ''} ${basic.last_name || ''}`.trim() || 'Unknown Practice'

  const address = [addr.address_1, addr.city, addr.state, addr.postal_code]
    .filter(Boolean).join(', ')

  const phone = addr.telephone_number
    ? addr.telephone_number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    : null

  const taxonomy = taxonomies.find(t => t.primary) || taxonomies[0] || {}

  return {
    npi: npiResult.number,
    name,
    address,
    phone,
    specialty: taxonomy.desc || '',
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.postal_code || '',
  }
}

const STATE_MAP = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { city, state, practiceType, count, valueProp } = req.body
  if (!city || !state) return res.status(400).json({ error: 'City and state are required' })

  const numLeads = parseInt(count) || 8
  const taxonomyCodes = TAXONOMY_CODES[practiceType] || TAXONOMY_CODES['primary care and family medicine']

  // Step 1: Fetch real providers from NPI registry
  let npiResults = []
  try {
    npiResults = await fetchNPIProviders(city, state, taxonomyCodes, numLeads)
  } catch (err) {
    return res.status(500).json({ error: `NPI registry error: ${err.message}` })
  }

  if (!npiResults.length) {
    return res.status(404).json({
      error: `No practices found in the NPI registry for ${city}, ${state}. Try a nearby larger city.`
    })
  }

  // Step 2: Extract clean practice info
  const practices = npiResults.map(extractPracticeInfo).filter(p => p.name && p.address)

  // Step 3: Send real practice data to Claude for scoring + outreach only
  const practiceList = practices.slice(0, numLeads * 2).map((p, i) =>
    `${i + 1}. Name: ${p.name} | NPI: ${p.npi} | Address: ${p.address} | Phone: ${p.phone || 'not listed'} | Specialty: ${p.specialty}`
  ).join('\n')

  const prompt = `You are a CCM program specialist for Anchored Health Technologies. Below are REAL primary care practices pulled from the CMS NPI Registry in ${city}, ${state}.

Your job is to select the best ${numLeads} prospects from this list and score them for CCM fit. DO NOT invent or change any contact information — use exactly what is provided.

REAL PRACTICES FROM NPI REGISTRY:
${practiceList}

For each selected practice, return a JSON object with these exact fields:
- npi: the NPI number (copy exactly from list)
- name: practice name (copy exactly from list)
- address: address (copy exactly from list)
- phone: phone number (copy exactly from list, use null if not listed)
- website: null (we don't have this from NPI data)
- provider_count: your best estimate as an integer based on org type and name clues
- patient_volume: "Small (<500 pts)", "Medium (500-2000 pts)", or "Large (2000+ pts)"
- medicare_likelihood: "High", "Medium", or "Low" — based on practice type, location, specialty
- fit_score: "High", "Medium", or "Low" — overall CCM fit
- fit_rationale: 1-2 sentences explaining why this practice is or isn't a strong CCM candidate
- decision_maker: most likely job title to contact (e.g. "Practice Owner / MD", "Office Manager", "Medical Director")
- outreach_email: a genuine 5-6 sentence cold email emphasizing: ${valueProp}. Address to "Dear [decision_maker title]". Sign from "The Anchored Health Team". Reference ${city} specifically.

Pick practices most likely to be independent (not large hospital systems). Mix fit scores naturally.

Return ONLY a raw JSON array starting with [ and ending with ]. No markdown, no explanation.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: `Anthropic API error: ${response.status}`, detail: err })
    }

    const data = await response.json()
    let raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    const s = raw.indexOf('[')
    const e = raw.lastIndexOf(']')
    if (s === -1 || e === -1) return res.status(500).json({ error: 'No JSON array in Claude response', raw: raw.slice(0, 300) })

    const leads = JSON.parse(raw.slice(s, e + 1))
    return res.status(200).json({ leads, source: 'CMS NPI Registry' })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
