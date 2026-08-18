
import { Outlet } from "react-router";


function RegistrationLayout() {
  return (


    <section className="px-4 h-full lg:min-h-screen flex flex-col flex-1 lg:flex-row">
      {/* Decorative panel — large screens only */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-primary bg-[url('/doodles-onboarding.png')] bg-cover bg-center bg-no-repeat relative overflow-hidden shrink-0">
        {/* swap this for your actual pattern-illustration background image/svg */}
        <div className="lg:block lg:flex-1 hidden bg-primary bg-[url('/doodles-onboarding.png')] bg-cover bg-center bg-no-repeat" />

      </div>

      <div className="lg:flex lg:w-125 lg:justify-center lg:m-auto lg:shadow-lg lg:rounded-2xl lg:px-8 pb-4 bg-neutral-50">
        <Outlet />
      </div>
    </section>
  )
}

export default RegistrationLayout;
