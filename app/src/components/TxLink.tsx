import { ExternalLink } from "lucide-react";
import type { Hash } from "viem";
import { monadTestnet } from "../config/chains";

type TxLinkProps = {
  hash: Hash;
};

export function TxLink({ hash }: TxLinkProps) {
  const explorerUrl = monadTestnet.blockExplorers?.default.url;

  if (!explorerUrl) {
    return <code>{hash}</code>;
  }

  return (
    <a className="txLink" href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noreferrer">
      <span>{hash.slice(0, 10)}...{hash.slice(-8)}</span>
      <ExternalLink aria-hidden="true" size={14} />
    </a>
  );
}
