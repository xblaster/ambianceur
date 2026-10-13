import { useProfile } from "./lib/profile";
import { roomCodeFromPath, getFlash, usePath } from "./lib/router";
import { Home } from "./screens/Home";
import { RoomPage } from "./screens/Room";

export function App() {
  const path = usePath();
  const [profile, setProfile] = useProfile();
  const code = roomCodeFromPath(path);
  const flash = getFlash();

  if (code) return <RoomPage key={code} code={code} profile={profile} onProfileChange={setProfile} />;
  return <Home key={`${path}:${flash ?? ""}`} profile={profile} onProfileChange={setProfile} flash={flash} />;
}
