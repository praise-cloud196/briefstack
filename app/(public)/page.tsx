import Link from "next/link";
import { RotatingWord } from "@/components/rotating-word";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-surface-container-lowest">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="font-display-small text-on-surface mb-4">
          Turn <RotatingWord /> into content briefs
        </h1>
        <p className="font-body-large text-on-surface-variant mb-8 max-w-lg mx-auto">
          BriefStack helps content marketers turn rough ideas into structured,
          consistent briefs without starting from scratch every time.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/generate"
            className="inline-flex items-center px-6 py-3 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-opacity"
          >
            Create Your First Brief
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 sm:mt-20 max-w-3xl mx-auto w-full">
        <div className="p-4 rounded-xl bg-surface border border-outline-variant">
          <h3 className="font-title-small text-on-surface mb-1">Input</h3>
          <p className="font-body-small text-on-surface-variant">
            Add your topic, audience, and content details.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-outline-variant">
          <h3 className="font-title-small text-on-surface mb-1">Generate</h3>
          <p className="font-body-small text-on-surface-variant">
            Create a structured, writer-ready brief in seconds.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-outline-variant">
          <h3 className="font-title-small text-on-surface mb-1">Export</h3>
          <p className="font-body-small text-on-surface-variant">
            Copy, download, or save your brief for later.
          </p>
        </div>
      </div>
    </div>
  );
}
