"use client";

import { useActionState } from "react";
import { setOwnerEveryAction, type OwnerEveryState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: OwnerEveryState = {};

export function OwnerSettingsForm({ ownerEvery }: { ownerEvery: number | null }) {
  const [state, action, pending] = useActionState(setOwnerEveryAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="owner-every">Owner link every N turns</Label>
        <Input
          id="owner-every"
          name="ownerEvery"
          type="number"
          min={0}
          max={50}
          step={1}
          required
          defaultValue={ownerEvery ?? 0}
          className="sm:w-32"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save interval"}
      </Button>
      <div className="text-sm leading-6 text-ink/70 sm:pb-2">
        {state.error ? (
          <p role="alert" className="text-[#8d2f2f]">
            {state.error}
          </p>
        ) : (
          <p>0 turns the share off. 3 means turns 3, 6, 9, and so on.</p>
        )}
        {state.ok ? <p className="text-pine">Saved.</p> : null}
      </div>
    </form>
  );
}