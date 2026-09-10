import WatchClient from "./watch-client";

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function WatchPage() {
  return <WatchClient />;
}
