import { Session } from "./session";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Session>{children}</Session>;
}
