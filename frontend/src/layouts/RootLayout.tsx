import { Outlet } from "react-router";


function RootLayout() {
  return (


    <section className="px-4 h-full flex flex-col flex-1 bg-neutral-50">
      <Outlet />
    </section>
  )
}

export default RootLayout;
