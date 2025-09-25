'use client'
import Head from 'next/head'

type Props = {
  title?: string
  description?: string
  canonicalPath?: string   // e.g. `/u/nathan/1970s-us-states`
}

export default function SeoHead({ title, description, canonicalPath }: Props) {
  const site = 'https://app.plateapedia.com'
  const url = canonicalPath ? `${site}${canonicalPath}` : site
  const safeTitle = title ? `${title} · Plateapedia` : 'Plateapedia'
  const safeDesc = description || 'Track and share license plate collections.'
  return (
    <Head>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={url} />
      <meta property="twitter:card" content="summary" />
    </Head>
  )
}
