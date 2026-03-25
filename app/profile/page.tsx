import { auth } from "@clerk/nextjs/server"
import type { AppRole } from "@/lib/roles";

type AppUser = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  created: boolean;
};


export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="lp-card">
        <h1 className="text-2xl font-bold text-white mb-4">
          Profile
        </h1>

        <div className="lp-interactive-panel">
          <label className="lp-form-label">Display Name</label>
          <input
            className="lp-input-strong"
            placeholder="Enter display name"
          />
        </div>

        <div className="lp-action-strip mt-6">
          <button className="lp-button">
            Save Profile
          </button>
        </div>
      </div>
    </main>
  )
}