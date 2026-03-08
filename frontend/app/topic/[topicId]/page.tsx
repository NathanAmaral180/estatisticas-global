import EntityKindPage from "@/app/shared/EntityKindPage"

export default async function TopicPage(props: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await props.params
  return <EntityKindPage kind="topic" id={topicId} />
}
