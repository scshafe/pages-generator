import { ViewStylePanel } from "@/blogcomponents/settings/ViewStylePanel";

export default function StylesPage() {
  if (process.env.NEXT_PUBLIC_BUILD_MODE === "publish") {
    return (
      <section className="surface hero">
        <h1>Styles</h1>
        <p>Styles are only available in Author Mode.</p>
      </section>
    );
  }

  return (
    <section className="surface hero">
      <ViewStylePanel />
    </section>
  );
}
