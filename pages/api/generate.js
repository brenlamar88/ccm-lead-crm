export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { city, state, practiceType, count, valueProp } = req.body

  if (!city || !state) return res.status(400).json({ error: 'City and state are required' })

  const prompt = `Generate ${count} CCM prospect leads for ${practiceType} in ${city}, ${state} for Anchored Health Technologies, a chronic care management (CCM) platform that helps primary care practices enroll Medicare patients and bill CMS $40–$100+ per patient per month.

Return ONLY a valid JSON array. Each object must have exactly these fields:
- name: realistic practice name for this region
- address: realistic street address in ${city}, ${state}
- phone: realistic local phone number with area code
- website: realistic website URL or null
- provider_count: integer number of providers
- patient_volume: exactly one of "Small (<500 pts)", "Medium (500-2000 pts)", "Large (2000+ pts)"
- medicare_likelihood: exactly one of "High", "Medium", "Low"
- fit_score: exactly one of "High", "Medium", "Low"
- fit_rationale: 1-2 sentences specific to this practice and location
- decision_maker: specific job title to contact
- outreach_email: 5-6 sentence cold email emphasizing ${valueProp}. Address to "Dear [decision_maker title]". Sign from "The Anchored Health Team". Make it specific to ${city} and the practice type. No generic filler.

Prioritize independent practices. Mix fit scores: roughly half High, a third Medium, rest Low.

Start your response with [ and end with ]. No markdown, no backticks, no explanation whatsoever.`

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
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const s = cleaned.indexOf('[')
    const e = cleaned.lastIndexOf(']')
    if (s === -1 || e === -1) return res.status(500).json({ error: 'No JSON array in response', raw: cleaned.slice(0, 300) })

    const leads = JSON.parse(cleaned.slice(s, e + 1))
    return res.status(200).json({ leads })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
