import { StoryScreenPage } from "../story/load";

export const metadata = { title: "Edit · Sunset Soul" };

// Edit from Entry Detail (Build Spec 3.8, B3d): the story screen with the words, recording and
// title filled in. No bottom bar.
export default async function EditEntryPage(props: PageProps<"/journal/[id]/edit">) {
  const { id } = await props.params;
  return <StoryScreenPage id={id} mode="edit" />;
}
