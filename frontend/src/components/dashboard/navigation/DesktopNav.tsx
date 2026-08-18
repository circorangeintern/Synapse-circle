import Logo from "@/components/navigation/Logo"
import { HugeiconsIcon } from "@hugeicons/react";
import { NavLink, useNavigate } from "react-router"
import { deskstopLinks } from "./navLinks"
import { LogoutIcon } from "@hugeicons/core-free-icons";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { logout, userProfile } from "@/utils/safewalkFn";
import { FullSpinner } from "@/components/Loader";
import { getInitials } from "@/utils/getInitials";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { clearAuth } from "@/lib/authStorage";
import { trackEvent } from "@/lib/mixpanelClient";




function DesktopNav() {
  const navigate = useNavigate()
  const token = useAuthStore(state => state.token)


  const { data, isPending } = useSuspenseQuery({
    queryKey: ["getUser"],
    queryFn: userProfile
  })

  const { mutate: userLogout } = useMutation({
    mutationFn: logout,
    onSuccess: (data) => {

      if (!data.success) {
        toast.error(data.message)
        return;
      }

      trackEvent("user_logout")

      clearAuth();

      navigate(0)
    },
    onError: (err) => {
      console.error(err)
    }

  })

  function handleLogout() {
    if (!token) {
      return;
    }

    userLogout({ refreshToken: token });



  }


  if (isPending) {
    return <FullSpinner />
  }



  const { profile } = data

  if (!profile) {
    return null
  }



  return (
    <aside className="hidden lg:flex lg:flex-col bg-neutral-50 sticky left-0 top-0 shrink-0 p-4 border-r border-r-neutral-100 overflow-hidden h-screen">
      <div className="border-b border-b-neutral-100 py-4">
        <Logo />
      </div>
      <div className="flex flex-col pt-8 h-full justify-between">
        <nav>
          <ul>
            {deskstopLinks.map((link) => <NavLink to={link.to} key={link.sectionId} end={link.end} className={({ isActive }) => `flex flex-row gap-6 font-medium rounded-lg hover:bg-brand-50 px-4 py-3.5 ${isActive ? "text-brand-500 bg-brand-100" : "text-neutral-400"}`}>
              <HugeiconsIcon icon={link.icon} />
              <p className="text-sm">{link.label}</p>
            </NavLink>)
            }
          </ul>
        </nav>

        <div className=" flex justify-between items-center">
          <div className="flex items-center justify-center gap-4">
            <div className="size-10 bg-brand-200 rounded-full flex aspect-video overflow-hidden justify-center items-center">
              {profile?.profilePicture ? <img src={`${profile.profilePicture}`} alt="user profile pictures" className="w-full object cover h-full" /> : <p className="font-bold text-brand-500">{getInitials(profile.name)}</p>}
            </div>

            <p className="text-brand-500 font-medium">{profile.name}</p>
          </div>
          <button className="text-danger-500" onClick={handleLogout}>
            <HugeiconsIcon icon={LogoutIcon} size={20} />
          </button>
        </div>
      </div>
      <div className="text-sm text-neutral-600 py-4 space-y-2 sticky bottom-0 border-t border-t-neutral-100">
        <p>Version 2.4.0</p>
        <p>&copy; 2026 SafeWalk Inc.</p>
      </div>
    </aside >
  )
}

export default DesktopNav
