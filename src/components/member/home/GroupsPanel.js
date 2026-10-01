import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Friends from "../Friends";
import Groups from "../Groups";
import { flowPanelClass } from "./shared";

const tabTriggerClass =
  "rounded-full py-2 text-[0.85rem] font-semibold text-muted-foreground data-[state=active]:bg-gold data-[state=active]:text-black data-[state=active]:shadow-none hover:text-foreground";

// Groups action button shows Friends.js and Groups.js as tabs, sharing the
// same zoomed phone panel the other flows render into.
function GroupsPanel({
  tab,
  onTabChange,
  onSelectFriend,
  onTotalChange,
  onWalletChange,
}) {
  // Which way the incoming pane should slide in from — "right" when moving
  // Friends -> Groups (tab order left to right), "left" for the reverse.
  const [direction, setDirection] = useState("right");

  const selectTab = (next) => {
    if (next === tab) return;
    setDirection(next === "groups" ? "right" : "left");
    onTabChange(next);
  };

  return (
    <div className={flowPanelClass}>
      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList className="grid grid-cols-2 w-full h-auto p-1 rounded-full bg-white/[0.04] gap-1">
          <TabsTrigger value="friends" className={tabTriggerClass}>
            Friends
          </TabsTrigger>
          <TabsTrigger value="groups" className={tabTriggerClass}>
            Groups
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        key={tab}
        className={cn(
          "mt-3",
          direction === "left"
            ? "animate-slide-in-left"
            : "animate-slide-in-right",
        )}
      >
        {tab === "friends" ? (
          <Friends onSelectFriend={onSelectFriend} />
        ) : (
          <Groups
            onTotalChange={onTotalChange}
            onWalletChange={onWalletChange}
          />
        )}
      </div>
    </div>
  );
}

export default GroupsPanel;
