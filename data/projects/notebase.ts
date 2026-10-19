import { Project } from "@/types";

export const notebase: Project = {
  title: "Notebase",
  description:
    "A web app and browser extension for saving snippets of the web as you read, then compiling them into one cited Markdown document.",
  fullDescription: `Notebase is a note-taking tool built for capturing from the web. A browser extension lets you save text from any page without leaving it, and a web app lets you organize those notes and compile them into a single Markdown document, with every note's source preserved.

### Browser Extension
- **Select-to-save:** highlight text on any page, right-click, and save it as a note.
- **Automatic sources:** the page URL, title, and favicon are captured with every note.
- **Quick capture popup:** a save form that's pre-filled with your selection, plus your most recent notes.

### Web App
- **Organize:** browse notes and manage them with folders and tags.
- **Bundles:** group notes into a bundle and put them in order.
- **Compile:** turn a bundle into one editable Markdown doc, with settings for headings, quote style, footnoted sources, tags, and separators.
- **Export:** download the finished doc as a file.

### Tech Stack
- **WXT + React** for the extension
- **better-auth** for authentication shared across the extension and web app
- **PostgreSQL + Drizzle ORM** for data
- **TypeScript** throughout`,
  projectSource: "Personal Project",
  liveLink: "https://notebase.abubeker.dev",
  status: "live",
  featuredImage: "/assets/projects/notebase-main.png",
  images: [
    "/assets/projects/notebase-1.png",
    "/assets/projects/notebase-2.png",
    "/assets/projects/notebase-3.png",
  ],
  alt: "Notebase web app and browser extension capturing a snippet from a web page",
  contribution:
    "Designed and built both the browser extension and the web app solo, from the capture flow to the bundle and compile pipeline, with shared auth across both.",
  toolsId: [
    "react",
    "typescript",
    "wxt",
    "betterauth",
    "postgresql",
    "drizzle",
  ],
};
