import { useSuspenseQuery } from "@tanstack/react-query";
import Header from "./Header";
import Button from "@/components/ui/button"
import { userProfile } from "@/utils/safewalkFn";
import { Hospital02Icon, Location06Icon, UserSettings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Suspense } from "react";
import { FullSpinner } from "../Loader";

export default function HomeEmpty() {

  const navigate = useNavigate()

  const { data: { profile } } = useSuspenseQuery({
    queryKey: ["getUser"],
    queryFn: userProfile
  })


  if (!profile) {
    return;
  }


  const { trustedContactsAdded, locationPermissionEnabled, institutionSelected } = profile.safetySetup


  function handleState(value: string) {
    if (value === "location") {
      navigate("/onboarding/location")
    }

    if (value === "university") {
      if (!locationPermissionEnabled) {
        toast.info("Your need to Enable Location First");
        return
      }

      if (!trustedContactsAdded) {
        toast.info("You need to add trusted contacts after location")
        return;
      }

      navigate("/onboarding/school-form")
    }

    if (value === "contacts") {
      if (!locationPermissionEnabled) {
        toast.info("Your need to Enable Location First");
        return
      }

      navigate("/onboarding/contact-form")
    }

  }

  return (
    <div className="pb-30 space-y-2">
      <Suspense fallback={<FullSpinner />}>


        <Header title="SafeWalk Home" caption="Setup Required" />
        <div className="space-y-4 mb-6">
          <div className="flex size-40 rounded-full bg-neutral-200 justify-center items-center mx-auto" >
            <div className="size-32.5 rounded-full flex justify-center items-center bg-neutral-400 font-black text-[28px] text-white">SOS</div>
          </div>

          <div className="text-center">
            <h3 className="font-bold text-neutral-900">SOS trigger is temporarily unavailable</h3>
            <p className="text-sm text-neutral-700">Complete the setup steps below to activate emergency services.</p>
          </div>
        </div>

        <div className="space-y-4">
          {!trustedContactsAdded && <div className="bg-white p-4 space-y-3 border border-neutral-100 rounded-xl">
            <div className="flex gap-3 ">
              <div className="text-brand-500 size-10 flex justify-center items-center">
                <HugeiconsIcon icon={UserSettings01Icon} />
              </div>
              <div className="space-y-1">
                <h3 className="text-neutral-900 font-bold text-sm">Trusted Contacts</h3>
                <p className="text-xs text-neutral-700">Add trusted emergency contacts to configure automatic alert broadcasting sequence.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => handleState("contacts")}>Configure Contacts </Button>
          </div>}

          {!locationPermissionEnabled && <div className="bg-white p-4 space-y-3 border border-neutral-100 rounded-xl">
            <div className="flex gap-3 ">
              <div className="text-brand-500 size-10 flex justify-center items-center">
                <HugeiconsIcon icon={Location06Icon} />
              </div>
              <div className="space-y-1">
                <h3 className="text-neutral-900 font-bold text-sm">Location Services</h3>
                <p className="text-xs text-neutral-700">Grant GPS access permission to link live dispatcher map markers.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => handleState("location")}>Enable Location</Button>
          </div>}


          {!institutionSelected && <div className="bg-white p-4 space-y-3 border border-neutral-100 rounded-xl">
            <div className="flex gap-3 ">
              <div className="text-brand-500 size-10 flex justify-center items-center">
                <HugeiconsIcon icon={Hospital02Icon} />
              </div>
              <div className="space-y-1">
                <h3 className="text-neutral-900 font-bold text-sm">Connect Institution</h3>
                <p className="text-xs text-neutral-700">Select your institution to establish a direct link with campus security.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => handleState("university")}>Select Institution</Button>
          </div>}

        </div>
      </Suspense>

    </div>
  )
}

