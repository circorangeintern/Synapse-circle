import React from "react";


interface SearchHeaderProps {
  title: string;
  caption?: string;
  children?: React.ReactNode

}

function SearchHeader({ title, caption, children }: SearchHeaderProps) {
  return (
    <div className="flex flex-col flex-1 sticky bg-neutral-50 w-full py-4 top-0 z-50 space-y-4">
      <div className="flex flex-col">
        <h2 className="text-neutral-900 font-bold text-2xl">{title}</h2>
        <p className="font-medium text-neutral-700 text-sm">{caption}</p>
      </div>
      <div className="flex flex-col flex-1 gap-4">
        {children}
      </div>
    </div>
  )
}

export default SearchHeader
