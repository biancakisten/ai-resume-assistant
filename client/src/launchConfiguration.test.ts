import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const clientFile = (name: string) =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')

describe('launch configuration', () => {
  it('provides the approved browser title and description', () => {
    const indexHtml = clientFile('index.html')

    expect(indexHtml).toContain(
      '<title>AI Resume Assistant | Pixel Pals</title>',
    )
    expect(indexHtml).toContain(
      'content="Create, improve, preview and download a professional résumé with the Pixel Pals AI Resume Assistant."',
    )
  })

  it('rewrites direct SPA routes to the application entry point', () => {
    const configuration = JSON.parse(clientFile('vercel.json')) as {
      rewrites?: Array<{ destination?: string; source?: string }>
    }
    const routes = clientFile('src/app/routes/AppRouter.tsx')

    expect(configuration.rewrites).toEqual([
      { destination: '/index.html', source: '/(.*)' },
    ])
    expect(routes).toContain(
      '<Route path="/resume-builder" element={<ResumeBuilderPage />} />',
    )
  })
})
