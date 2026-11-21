import { StoryScreenPage } from "./load";

export const metadata = { title: "Your story · Sunset Soul" };

// Add your story (Build Spec 3.7, B3a): typing first, speaking right below. No bottom bar.
export default async function StoryPage(props: PageProps<"/journal/[id]/story">) {
  const { id } = await props.params;
  return <StoryScreenPage id={id} mode="new" />;
}
