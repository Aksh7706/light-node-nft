import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

const getRequiredPrivateKeys = (networkName: string): string[] => {
  const keys = [
    `PRIVATE_KEY_${networkName.toUpperCase()}`,
    `PRIVATE_KEY_SIGNER_${networkName.toUpperCase()}`,
    `PRIVATE_KEY_WHITELISTED_USER_0_${networkName.toUpperCase()}`,
    `PRIVATE_KEY_WHITELISTED_USER_1_${networkName.toUpperCase()}`,
    `PRIVATE_KEY_WHITELISTED_USER_2_${networkName.toUpperCase()}`
  ];
  
  const values = keys.map(key => process.env[key]);
  if (values.some(v => !v)) {
    return [];
  }
  return values as string[];
};

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 150,
            },
            viaIR: true,
        },
    },
    defaultNetwork: "sketchpad",
    networks: {
        hardhat: {},
        local: {
            url: "http://localhost:8545",
            accounts: getRequiredPrivateKeys("LOCAL"),
        },
        forma: {
            url: "https://rpc.forma.art",
            accounts: getRequiredPrivateKeys("FORMA"),
        },
        sketchpad: {
            url: "https://rpc.sketchpad-1.forma.art",
            accounts: getRequiredPrivateKeys("SKETCHPAD"),
        },
    },
    paths: {
        sources: "./contracts",
    },
    etherscan: {
        apiKey: {
            forma: "abc",
            sketchpad: "abc",
        },
        customChains: [
            {
                network: "forma",
                chainId: 984122,
                urls: {
                    apiURL: "https://explorer.forma.art/api",
                    browserURL: "https://explorer.forma.art",
                },
            },
            {
                network: "sketchpad",
                chainId: 984123,
                urls: {
                    apiURL: "https://explorer.sketchpad-1.forma.art/api",
                    browserURL: "https://explorer.sketchpad-1.forma.art",
                },
            },
        ],
    },
};

export default config;