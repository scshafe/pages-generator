import { ViewsPanel } from "@/blogcomponents/settings/ViewsPanel";

export default function ViewsPage() {
  if (process.env.NEXT_PUBLIC_BUILD_MODE === "publish") {
    return (
      <section className="surface hero">
        <h1>Views</h1>
        <p>Views are only available in Author Mode.</p>
      </section>
    );
  }

  return (
    <section className="surface hero">
      <ViewsPanel />
    </section>
  );
}
