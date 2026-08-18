import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import Button from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/utils/index"
import { trackEvent } from "@/lib/mixpanelClient"

function OnboardingLayout() {
  const navigate = useNavigate()
  const location = useLocation()


  const currentSubPath: string =
    location.pathname.split("/onboarding")[1]?.replace(/^\//, "") || "welcome"

  const routeMilestoneMap: Record<string, number> = {
    welcome: 0,
    location: 0,
    "trusted-contact": 1,
    "contact-form": 1,
    "school-info": 2,
    "school-form": 2,
  }

  const activeIndex = routeMilestoneMap[currentSubPath] ?? 0
  const currentStepNum = activeIndex + 1
  const totalSteps = ["location", "trusted-contact", "school-info"]

  function handleSkip() {
    trackEvent("onboarding_abandoned")
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="h-screen lg:h-full lg:min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">

      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-primary bg-[url('/doodles-onboarding.png')] bg-cover bg-center bg-no-repeat relative shrink-0 lg:overflow-hidden" />



      <section className="flex-1 flex flex-col px-4 py-8 min-h-0 lg:overflow-y-auto">
        <div className="w-full flex flex-1 flex-col lg:max-w-125 lg:shadow-lg lg:rounded-2xl lg:p-8 lg:m-auto">
          <div className="flex justify-between items-center lg:-mx-4">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
              <HugeiconsIcon icon={ArrowLeft02Icon} /> Back
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>Skip</Button>
          </div>

          <div className="flex flex-col flex-1 justify-between">
            <div className="pt-4">
              <p className="text-sm font-medium text-neutral-700 pb-3">
                {`Step ${currentStepNum} of ${totalSteps.length}`}
              </p>
              <div className="flex items-center gap-2">
                {totalSteps.map((_, index) => {
                  const isCompleted = index < activeIndex
                  const isActive = index === activeIndex
                  return (
                    <React.Fragment key={index}>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full h-8 w-8 shrink-0 font-semibold text-xs transition-colors duration-200",
                          isCompleted
                            ? "bg-brand-500 text-white"
                            : isActive
                              ? "bg-primary text-white"
                              : "bg-brand-100 text-neutral-400"
                        )}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </span>
                      {index < totalSteps.length - 1 && (
                        <div className="flex-1 h-2 rounded bg-brand-100" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 flex-col flex bg-neutral-50">
              <Outlet />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OnboardingLayout
