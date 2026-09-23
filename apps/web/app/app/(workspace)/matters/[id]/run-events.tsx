"use client";

import { useEffect, useState } from "react";

export interface RunEventRow {
  sequence: number;
  kind: string;
}

export function RunEvents(props: { matterId: string; initial: RunEventRow[] }) {
  const [events, setEvents] = useState(props.initial);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let stopped = false;
    const timer = setInterval(() => {
      const cursor = events.reduce((max, event) => Math.max(max, event.sequence), 0);
      void fetch(`/api/matters/${props.matterId}/events?after=${cursor}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("poll failed");
          const body = (await response.json()) as { events?: RunEventRow[] };
          const incoming = body.events ?? [];
          if (stopped || incoming.length === 0) return;
          setEvents((current) => {
            const seen = new Set(current.map((event) => event.sequence));
            const added = incoming.filter((event) => !seen.has(event.sequence));
            return added.length === 0 ? current : [...current, ...added];
          });
          setProblem("");
        })
        .catch(() => {
          if (!stopped) setProblem("Event polling failed. The list is the last loaded record.");
        });
    }, 4000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [events, props.matterId]);

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-graphite-700">Events</h3>
      {problem ? <p className="mt-1 text-sm text-graphite-700">{problem}</p> : null}
      <ul aria-live="polite" className="mt-2 space-y-1">
        {events.length === 0 ? <li className="text-sm text-graphite-500">No events yet.</li> : null}
        {events.map((event) => (
          <li key={event.sequence} className="font-mono text-xs text-graphite-700">
            {event.sequence}. {event.kind}
          </li>
        ))}
      </ul>
    </div>
  );
}
