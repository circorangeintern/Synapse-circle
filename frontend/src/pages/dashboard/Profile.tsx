import Button from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { useSuspenseQuery, useMutation } from "@tanstack/react-query"
import { FullSpinner } from "@/components/Loader"
import { logout, userProfile } from "@/utils/safewalkFn"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/store/useAuthStore"
import type { ContactDTO } from "@/types"
import { sentenceCase } from "@/utils/sentenceCase"
import Modal from "@/components/dashboard/Modal"
import { DialogClose } from "@/components/ui/dialog"
import EmergencyContact from "@/components/onboarding/EmergencyContact"
import React from "react"
import { getInitials } from "@/utils/getInitials"
import { toast } from "sonner"
import { clearAuth } from "@/lib/authStorage"
import { trackEvent } from "@/lib/mixpanelClient"



export default function Profile() {

  const navigate = useNavigate();
  const token = useAuthStore(state => state.token)



  const { data: { profile }, isPending } = useSuspenseQuery({
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
      clearAuth()

      navigate(0)
    },
    onError: (err) => {
      console.error(err)
    }

  })


  if (isPending) {
    return <FullSpinner />
  }



  function handleLogout() {
    if (!token) {
      return;
    }

    toast.success("Logout Successful")

    userLogout({ refreshToken: token });



  }


  if (!profile) {
    return;
  }

  const numOfContacts = profile.trustedContacts.length;


  return (
    <section className="relative pb-24 -mr-4 -ml-4">
      <div className="flex flex-col flex-1 sticky bg-neutral-50 w-full pb-4 pt-8 top-0 right-0 z-50 space-y-4 border-b border-b-neutral-200">

        <div className="px-4">
          <h2 className="text-neutral-900 font-bold text-2xl">Profile &amp; Settings</h2>
        </div>
      </div>
      <div>
        <div className="p-4 space-y-4">
          <div className="border border-neutral-200 bg-white p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-brand-200 rounded-full flex aspect-video overflow-hidden justify-center items-center">

                {profile.profilePicture ? <img src={`${profile.profilePicture}`}
                  alt="user profile pictures" className="w-full object cover h-full" /> : <p className="font-bold text-brand-500">{profile.name && getInitials(profile.name)}</p>}
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-neutral-900">{profile.name}</h3>
                <small className="block text-xs text-neutral-700">{profile.email}</small>
                <small className="block text-xs text-neutral-700"
                >{profile.university}</small>
              </div>
            </div>
            <Button variant="outline">Edit Profile</Button>
          </div>

          <div className=" space-y-1.5">
            <h2 className="text-neutral-700 font-bold text-sm">TRUSTED CONTACTS ({numOfContacts})</h2>
            {profile.trustedContacts.map((contact: ContactDTO) => (<ContactCard {...contact} key={contact.id} />))}
          </div>

          <div className="space-y-2">
            <h2 className="text-neutral-700 font-bold text-sm">PRIVACY &amp; PERMISSIONS </h2>
            <div className="flex flex-col border border-neutral-200 rounded-lg">
              <div className="flex justify-between items-center p-3">
                <p className="font-medium text-neutral-900 text-sm">Save alert history</p>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">
                <div>
                  <h3 className="text-sm text-neutral-900 font-medium">Location Permission</h3>
                  <small className="text-xs text-neutral-700">Granted</small>
                </div>
                <p className="text-xs text-neutral-700 font-semibold">Manage</p>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">
                <div>
                  <h3 className="text-sm text-neutral-900 font-medium">Browser Notifications</h3>
                  <small className="text-xs text-neutral-700">Allowed</small>
                </div>
                <p className="text-xs text-neutral-700 font-semibold">Manage</p>
              </div>
            </div>
          </div>


          <div className="space-y-2">
            <h2 className="text-neutral-700 font-bold text-sm">HELP &amp; SUPPORT </h2>
            <div className="flex flex-col border border-neutral-200 rounded-lg">
              <div className="flex items-center justify-between p-3">

                <h3 className="text-sm text-neutral-900">Frequently Asked Questions</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">

                <h3 className="text-sm text-neutral-900 font-medium">Contact Support</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>

              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">

                <h3 className="text-sm text-neutral-900 font-medium">Report a Problem</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>

              </div>

            </div>
          </div>


          <div className="space-y-2">
            <h2 className="text-neutral-700 font-bold text-sm">ABOUT </h2>
            <div className="flex flex-col border border-neutral-200 rounded-lg">
              <div className="flex items-center justify-between p-3">

                <h3 className="text-sm text-neutral-900">App Version (V1.0)</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">

                <h3 className="text-sm text-neutral-900 font-medium">Privacy Policy</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>

              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">

                <h3 className="text-sm text-neutral-900 font-medium">Terms &amp; Conditions</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>

              </div>
              <div className="flex items-center justify-between p-3 border-t border-t-neutral-200">

                <h3 className="text-sm text-neutral-900 font-medium">Help &amp; Support</h3>
                <div className=" flex items-center justify-center text-neutral-700 font-semibold size-3.5">
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-full" />
                </div>

              </div>

            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" className="border-error text-error ring-error outline-error" onClick={handleLogout}> Logout</Button>
            <Button variant="destructive">Delete Account</Button>
          </div>



        </div>


      </div>

    </section>
  )
}

function ContactCard(contact: ContactDTO) {
  const [updatedContact, setUpdatedContact] = React.useState(contact)


  return (
    <div className="flex items-center justify-between space-y-1 border border-neutral-200 rounded-md p-3">
      <div>
        <h3 className="font-semibold text-xs text-neutral-900">{contact.name}</h3>
        <div className="text-neutral-600 text-xs flex gap-1">
          <p>{sentenceCase(contact.relationship!)}</p> &bull; <p>{contact.phoneNumber}</p></div>
      </div>

      <Modal trigger={<Button variant="outline" size="sm">Edit</Button>} title="Edit Emergency Contact" description="Edit your contact informations" >

        <div className="flex flex-col gap-6">

          <EmergencyContact contact={updatedContact} onChange={setUpdatedContact} />

          <div className="flex justify-between gap-2">
            <DialogClose render={<Button size="sm" className="flex-1/2">Save</Button>} />
            <DialogClose render={<Button size="sm" variant="outline" className="flex-1/2"> Cancel</Button>} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

