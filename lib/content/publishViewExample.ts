import type { ComponentRecord, NodeRecord, ReferenceRecord, ResolvedNode } from "@/lib/content/types";

type BuildNodeInput = {
  type: ComponentRecord["type"];
  config?: Record<string, unknown>;
  children?: BuildNodeInput[];
};

let nodeCounter = 1;
let refCounter = 1;
let compCounter = 1;

function buildResolvedNode(input: BuildNodeInput, parentId: number | null = null): ResolvedNode {
  const node_id = nodeCounter++;
  const ref_id = refCounter++;
  const comp_id = compCounter++;

  const node: NodeRecord = {
    node_id,
    ref_id,
    parent_node_id: parentId ?? null
  };

  const component: ComponentRecord = {
    comp_id,
    type: input.type,
    config: input.config ?? {}
  };

  const reference: ReferenceRecord = {
    ref_id,
    node_id,
    comp_id
  };

  const resolved: ResolvedNode = {
    node,
    reference,
    component,
    config: { ...(input.config ?? {}) },
    children: []
  };

  if (input.children?.length) {
    const children = input.children.map((child) => buildResolvedNode(child, node_id));
    children.forEach((child, index) => {
      child.node.previous_node_id = children[index - 1]?.node.node_id ?? null;
      child.node.next_node_id = children[index + 1]?.node.node_id ?? null;
    });
    resolved.children = children;
    if (input.type === "Container" || input.type === "Group") {
      resolved.component.config = {
        ...resolved.component.config,
        child_node_id: children[0].node.node_id
      };
      resolved.config = { ...resolved.component.config };
    }
  }

  return resolved;
}

export function getPublishViewExample(): ResolvedNode {
  nodeCounter = 1;
  refCounter = 1;
  compCounter = 1;

  return buildResolvedNode({
    type: "Container",
    config: {
      path: "/PublishViewExample",
      name: "PublishViewExample",
      title: "Publish View Example"
    },
    children: [
      {
        type: "PlainTextUnit",
        config: {
          text: "PublishViewExample"
        }
      },
      {
        type: "PlainTextUnit",
        config: {
          text: "This view showcases the available component types and layout options."
        }
      },
      {
        type: "DividerUnit",
        config: {}
      },
      {
        type: "Group",
        config: {
          display: "grid",
          gap: "12px",
          padding: "16px",
          border: "1px solid #d7cdbf",
          borderRadius: "12px",
          backgroundColor: "#fffaf4"
        },
        children: [
          {
            type: "PlainTextUnit",
            config: { text: "Grouped content" }
          },
          {
            type: "LinkUnit",
            config: { label: "Example link", url: "https://example.com" }
          },
          {
            type: "ButtonUnit",
            config: { label: "Example button", url: "#" }
          }
        ]
      },
      {
        type: "CodeUnit",
        config: { code: "const greeting = 'Hello world';" }
      },
      {
        type: "CodeBlockUnit",
        config: {
          code: "function greet(name) {\n  return `Hello ${name}`;\n}\n\nconsole.log(greet('Codex'));"
        }
      },
      {
        type: "AlertUnit",
        config: { variant: "info", content: "This is an alert unit with a status message." }
      },
      {
        type: "MarkdownUnit",
        config: { content: "## Markdown\n\n- Bullet one\n- Bullet two\n\n**Bold text**" }
      },
      {
        type: "ImageMedia",
        config: {
          src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
          alt: "Example landscape"
        }
      },
      {
        type: "VideoMedia",
        config: {
          src: "https://www.w3schools.com/html/mov_bbb.mp4",
          autoplay: false
        }
      },
      {
        type: "PDFMedia",
        config: {
          src: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          title: "Sample PDF"
        }
      },
      {
        type: "ExperienceComponent",
        config: {
          position: "Product Designer",
          company: "Example Co",
          content: "Designed and shipped a new onboarding flow with a 20% lift in activation."
        }
      },
      {
        type: "SectionUnit",
        config: { title: "Section Unit", text: "Section layout sample." }
      },
      {
        type: "HtmlComponent",
        config: { content: "<div>Custom HTML Component</div>" }
      },
      {
        type: "JsComponent",
        config: { content: "console.log('Custom JS Component');" }
      }
    ]
  });
}
