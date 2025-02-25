import { type LiveManagedRuntime } from "@/layers/live-layer";
import React from "react";

export const RuntimeContext = React.createContext<LiveManagedRuntime | null>(null);
