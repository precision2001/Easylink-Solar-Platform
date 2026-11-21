import Image from "next/image";

// Only methods checkout actually offers (Stripe card, Afterpay, Zip).
const paymentOptions = [
  { name: "Zip", src: "/images/home/payment-zip.png", width: 115, height: 42 },
  { name: "Afterpay", src: "/images/home/payment-afterpay.png", width: 153, height: 53 },
  { name: "Visa", src: "/images/home/payment-visa.svg", width: 110, height: 36 },
  { name: "Mastercard", src: "/images/home/payment-mastercard.png", width: 71, height: 55 },
  { name: "American Express", src: "/images/home/payment-amex.png", width: 90, height: 54 },
];

export function PaymentOptionsSection() {
  return (
    <section className="bg-faint/30 px-4 py-16 sm:px-6 lg:py-[85px]">
      <div className="mx-auto max-w-[1000px]">
        <h2 className="text-center font-source-sans text-3xl font-bold tracking-[-0.75px] text-ink sm:text-[30px] sm:leading-[36px]">
          Choose Your Payment Options
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5 lg:gap-8">
          {paymentOptions.map((option) => (
            <div
              key={option.name}
              className="flex h-[83px] items-center justify-center rounded-[20px] bg-white p-4 shadow-[0px_8px_32px_-8px_rgba(17,28,39,0.12)]"
            >
              <Image
                src={option.src}
                alt={option.name}
                width={option.width}
                height={option.height}
                className="max-h-[53px] w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
