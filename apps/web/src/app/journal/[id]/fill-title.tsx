"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ensureTitleAction } from "../actions";

/** On Entry Detail for an entry without a title: asks for a suggested one, then shows it. */
export function FillTitle({ entryId }: { entryId: string }) {
  const router = useRouter();
  useEffect(() => {
    let live = true;
    void ensureTitleAction(entryId).then((title) => {
      if (live && title) router.refresh();
    });
    return () => {
      live = false;
    };
  }, [entryId, router]);
  return null;
}
