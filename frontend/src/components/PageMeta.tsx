import { Helmet } from 'react-helmet-async'

type PageMetaProps = {
  title: string
  description?: string
  author?: string
}

const PageMeta = ({ title, description, author }: PageMetaProps) => {
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {author && <meta name="author" content={author} />}
    </Helmet>
  )
}

export default PageMeta
