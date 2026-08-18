import type React from "react";

type CardType = {
  title: string;
  description: string;
  children: React.ReactNode
}

function CardItem({ title, description, children }: CardType) {

  return (
    <div className="p-4 space-y-3 bg-white shadow-md rounded-2xl transition-transform duration-300 hover:scale-105">
      <span className={`${typeof children === "string" ? "" : "bg-brand-100 h-12 w-12 text-primary flex items-center justify-center"} text-primary rounded-2xl text-sm font-semibold`}>
        {children}
      </span>
      <div className="space-y-2">
        <h4 className="font-semibold text-neutral-900">{title}</h4>
        <p className="text-default text-sm">{description}</p>
      </div>
    </div>

  )
}

export default CardItem;
