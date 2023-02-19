import { BN, Mangata } from "@mangata-finance/sdk";
import {
  fetchKSMPrice,
  calculatePriceInTarget,
  decimalsToAmount,
} from "./mangata-helpers";

import Tokens from "./tokens.json";

const MAINNET = [
  "wss://mangata-x.api.onfinality.io/public-ws",
  "wss://prod-kusama-collator-01.mangatafinance.cloud",
];

export async function fetchTokenPrices() {
  const mangata = Mangata.getInstance(MAINNET);

  const tokenPrices = new Map();
  tokenPrices.set("ksm", await fetchKSMPrice());

  for (let token of Tokens) {

    const sources = token.priceSource;
    let price = 1;
    for (let i = 0; i < sources.length; i++) {
      // Source for liquidity pool is structured: liquidity-<poolID>-<targetTokenID>
      if (sources[i].includes("liquidity")) {
        const sourceSplit = sources[i].split("-");
        const targetTokenID = sourceSplit[2];
        const targetDecimals = Tokens.find(
          (t) => t.id === targetTokenID
        )?.decimals;
        if (targetDecimals == undefined) process.exit(1);

        const poolID = sourceSplit[1];
        const priceInTarget = await calculatePriceInTarget(
          token.id,
          token.decimals,
          targetTokenID,
          targetDecimals,
          poolID,
          mangata
        );

        const targetOne = decimalsToAmount(1, targetDecimals);

        let priceInTargetNormalised;
        if (priceInTarget.gt(new BN(targetOne.toString()))) {
          priceInTargetNormalised = priceInTarget
            .div(new BN((10 ** targetDecimals).toString()))
            .toNumber();
        } else {
          priceInTargetNormalised = priceInTarget.toNumber() / targetOne;
        }

        price *= priceInTargetNormalised;
      } else if (sources[i].includes("usd")) {
        const token = sources[i].split("-")[1];
        price *= tokenPrices?.get(token) || 0;
      }
    }
    tokenPrices.set(token.symbol.toLowerCase(), price);
  }

  return tokenPrices;
}
