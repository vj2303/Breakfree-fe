import Dropdown from '@/components/Dropdown';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import { audienceTypeOptions, contentTypeOptions, deliveryMethodOptions, outputTypeOptions, industryTypeOptions } from '@/constants/options';
import Image from 'next/image';

type Prompt = {
  content_type: string;
  audience_type: string;
  delivery_method: string;
  content_theme: string;
  target_industry: string;
};

interface ResponsesContainerProps {
  prompts?: { summary: string }[];
  handleSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
  prompt: Prompt;
  handleChange: (name: string, value: string | number) => void;
  handleGetPrompts: (prompt: Prompt) => void;
}

const ResponsesContainer: React.FC<ResponsesContainerProps> = ({
  prompts = [{ summary: "" }, { summary: "" }, { summary: "" }, { summary: "" }],
  handleSelectPrompt,
  isLoading,
  prompt,
  handleChange,
  handleGetPrompts,
}) => {
  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="bg-[#FFFFFF] p-[28px] rounded-xl flex flex-col items-center gap-[20px] w-full max-w-[1400px] mx-auto">
        <div className="flex justify-between items-start w-full gap-[20px]">
          <Dropdown
            img={<Image src="/Icons/typeOfContentIcon.png" alt="Type of Content Icon" width={32} height={32} />}
            options={contentTypeOptions}
            name="content_type"
            label="Type Of Content"
            onChange={handleChange}
            isHorizontal={true}
          />
          <Dropdown
            img={<Image src="/Icons/typeOfAudience.png" alt="Type of Audience Icon" width={32} height={32} />}
            options={audienceTypeOptions}
            name="audience_type"
            label="Type Of Audience"
            onChange={handleChange}
            isHorizontal={true}
          />
          <Dropdown
            img={<Image src="/Icons/DeliveryMethod.png" alt="Delivery Method Icon" width={32} height={32} />}
            options={deliveryMethodOptions}
            name="delivery_method"
            label="Delivery Method"
            onChange={handleChange}
            isHorizontal={true}
          />
          <Dropdown
            img={<Image src="/Icons/ContentTheme.png" alt="Content Theme Icon" width={32} height={32} />}
            options={outputTypeOptions}
            name="content_theme"
            label="Content Theme"
            onChange={handleChange}
            isHorizontal={true}
          />
          <Dropdown
            img={<Image src="/Icons/Icons.png" alt="Target Industry Icon" width={32} height={32} />}
            options={industryTypeOptions}
            name="target_industry"
            label="Target Industry"
            onChange={handleChange}
            isHorizontal={true}
          />
        </div>
        <Button
          bg={"dark-bg"}
          text="white"
          onClick={() => handleGetPrompts(prompt)}
        >
          Generate
          <Image src={"/Vector.png"} alt="star" width={20} height={20} />
        </Button>
      </div>
      <div>
        <h1 className="font-bold text-[28px] pt-[40px] pb-[30px] text-left text-[#233141]">Suggested for you</h1>
        <div className="flex flex-wrap justify-between gap-[30px]">
          {isLoading ? (
            // Show loading skeletons
            Array.from(["", "", "", ""]).map((_, i) => (
              <div
                className="max-w-[48%] basis-[48%] text-left border bg-[#ffffff] rounded-xl p-[30px] shadow-sm"
                key={i}
              >
                <Loader />
                <p className="border-b-2 border-[#233141] ml-auto max-w-fit cursor-pointer text-[#233141]">
                  Ask this
                </p>
              </div>
            ))
          ) : (
            prompts.map((ele, i) => (
              ele.summary ? (
                <div
                  className="max-w-[48%] bg-[#ffffff] basis-[48%] text-left border rounded-[51px] p-[30px] shadow-sm"
                  key={i}
                >
                  <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.7273 21.1035C20.0098 19.3802 22.2747 15.9337 22.2747 11.9619C22.2747 6.26691 17.6464 1.63867 11.9514 1.63867C6.25636 1.63867 1.64453 6.26691 1.64453 11.9619C1.64453 15.9337 3.90941 19.3967 7.19185 21.1035" stroke="#E1C441" strokeWidth="2.6637" />
                    <path d="M15.3313 24.7285V25.0896C15.2329 26.8785 13.7558 28.2735 11.9504 28.2735C10.1451 28.2735 8.668 26.8785 8.58594 25.0896V24.7285" stroke="#E1C441" strokeWidth="2.6637" />
                    <path d="M16.2642 20.3633H7.63142C7.37762 20.3633 7.17188 20.569 7.17188 20.8228V24.2694C7.17188 24.5232 7.37762 24.7289 7.63142 24.7289H16.2642C16.518 24.7289 16.7238 24.5232 16.7238 24.2694V20.8228C16.7238 20.569 16.518 20.3633 16.2642 20.3633Z" stroke="#E1C441" strokeWidth="2.6637" />
                  </svg>

                  <p className="text-[#233141]">{ele.summary}</p>
                  <p
                    className="border-b-2 mt-2 border-[#233141] ml-auto max-w-fit cursor-pointer text-[#233141]"
                    onClick={() => handleSelectPrompt(ele.summary)}
                  >
                    Ask this
                  </p>
                </div>
              ) : (
                <Loader key={i} />
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsesContainer;