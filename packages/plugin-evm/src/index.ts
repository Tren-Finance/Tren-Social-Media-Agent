export * from "./actions/bridge";
export * from "./actions/swap";
export * from "./actions/transfer";
export * from "./actions/simpleLending";
export * from "./handlers/lendingHandler";
export * from "./providers/wallet";
export * from "./types";

import type { Plugin } from "@elizaos/core";
import { bridgeAction } from "./actions/bridge";
import { swapAction } from "./actions/swap";
import { transferAction } from "./actions/transfer";
import { SimpleLendingAction } from "./actions/simpleLending";
import { LendingHandler } from "./handlers/lendingHandler";
import { evmWalletProvider } from "./providers/wallet";

// Create lending action instance
const lendingAction = new SimpleLendingAction(evmWalletProvider as any);
const lendingHandler = new LendingHandler(lendingAction);

export const evmPlugin: Plugin & { handlers?: any[] } = {
    name: "evm",
    description: "EVM blockchain integration plugin",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    actions: [transferAction, bridgeAction, swapAction],
    handlers: [lendingHandler],
};

export default evmPlugin;
