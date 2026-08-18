import { Outlet } from "react-router";
import MobileNav from "@/components/dashboard/navigation/MobileNav"
import DesktopNav from "@/components/dashboard/navigation/DesktopNav";

function DashboardLayout() {
  return (


    <section className="px-4 h-full flex flex-col flex-1 lg:flex-row lg:gap-8 lg:items-start">
      <DesktopNav />
      <div className="flex flex-col flex-1 lg:flex-1 h-full lg:justify-center bg-neutral-50">
        <Outlet />
      </div>
      <MobileNav />
    </section>
  )
}

export default DashboardLayout;

