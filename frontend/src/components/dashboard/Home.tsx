
import Header from "./Header"
import Button from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { useNavigate } from "react-router"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { triggerSOS, userProfile } from "@/utils/safewalkFn"
import { useOnboardingStore } from "@/store/useOnboardingStore"
import useLocation from "@/utils/hooks/useLocation"
import { trackEvent } from "@/lib/mixpanelClient"
import { useGreeting } from "@/utils/hooks/useGreeting"
import { toast } from "sonner"
import React from "react"
import { clearAuth } from "@/lib/authStorage"
import type { ContactDTO } from "@/types"
import { useAlertStore } from "@/store/useAlertStore"
import HomeEmpty from "./HomeEmpty"





function Home() {
  const navigate = useNavigate()
  const updateLocation = useOnboardingStore(state => state.updateLocation);
  const { location, getLocation } = useLocation();
  const greeting = useGreeting();
  const setActiveAlertId = useAlertStore(state => state.setActiveAlertId)

  const { data } = useSuspenseQuery({
    queryKey: ["getUser"],
    queryFn: userProfile
  })

  React.useEffect(() => {

    if (!data.success) {

      if (data.code === "USER_NOT_FOUND") {

        toast.error(data.message)
        clearAuth()
        navigate(0)
      }
    }


  }, [data])

  if (!data.success) {
    return null;
  }



  const { mutate } = useMutation({
    mutationFn: triggerSOS,
    onSuccess: (data) => {

      if (!data.success) {
        console.log("ERROR", data)
      }

      console.log("[TRIGGER]", data.alertId)

      trackEvent("alert_delivery_confirmed")
      toast.success("SOS Alert Sent")

      setActiveAlertId(data.alertId)
      navigate("countdown")
      trackEvent("alert_dispatched")

    },
    onError: (err) => {
      console.log("ERROR", err)
    }
  })


  async function handleSOSTrigger() {

    trackEvent("sos_button_clicked")

    trackEvent("location_capture_attempted")

    const coords = location ?? (await getLocation())


    if (!coords) {

      trackEvent("location_capture_failed")

      return
    }

    trackEvent("location_captured")

    updateLocation({ longitude: coords.lng, latitude: coords.lat })

    mutate({ latitude: coords.lat, longitude: coords.lng, locationAvailable: true })
  }


  const { profile } = data

  if (!profile) {
    return;
  }

  const { isComplete } = profile.safetySetup


  if (!isComplete) {
    return <HomeEmpty />
  }




  return (
    <section className="relative pt-4 pb-16">
      <Header title={profile.university} caption={greeting} name={profile.name} imageUrl={profile.profilePicture}
      />
      <div className="mt-22 scroll-mt-20 mb-5">
        <div>
          <div className="flex size-40 rounded-full bg-[#FEE2E2] justify-center items-center mx-auto">
            <Button variant="sos" className="size-32.5 rounded-full font-black text-3xl" onClick={handleSOSTrigger}>SOS</Button>
          </div>

          <div className="space-y-6">
            <div className="text-center mt-6">
              <p className="text-neutral-900 font-medium">Hold or tap to request emergency help.</p>
              <p className="text-sm text-neutral-700">Initiates 5 second countdown before notifying dispatchers and contacts.</p>
            </div>
            <div className="space-y-2.5">
              <div className="bg-white p-3 rounded-lg shadow-md space-y-1.5">
                <h3 className="font-semibold text-neutral-900">Campus Security</h3>
                <small className="block text-neutral-600 text-sm">Institution Security Office</small>
                <a className="text-sm font-semibold text-neutral-700 inline-flex items-center gap-2">View Details <HugeiconsIcon icon={ArrowRight01Icon} size={16} /></a>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-md space-y-1.5">
                <h3 className="font-semibold text-neutral-900">Alert History</h3>
                <small className="block text-neutral-600 text-sm">Review previous emergency alerts.</small>
                <a onClick={() => navigate("history")} className="text-sm font-semibold text-neutral-700 inline-flex items-center gap-2">View Details <HugeiconsIcon icon={ArrowRight01Icon} size={16} /></a>
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-neutral-900 text-sm font-bold">Trusted Contacts</h3>
              <p className="text-xs text-neutral-700 font-semibold">Manage Contacts</p>
            </div>
          </div>
          <div className="">
            {profile.trustedContacts.map((contact: ContactDTO) => (<div className="py-2 flex items-center justify-between border-b border-b-neutral-100" key={contact.phoneNumber}>
              <div>
                <p className="font-semibold text-neutral-900 text-xs">{contact.name}</p>
                <p className="text-xs text-neutral-600">{contact.relationship}</p>
              </div>
              <p className="text-neutral-900 text-sm">{contact.phoneNumber}</p>
            </div>))}


          </div>
        </div>
      </div >
    </section >
  )
}

export default Home
