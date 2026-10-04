import { MeResponse } from "@/app/api/app/me/types";
import useSWR from "swr";

const useCredits = () => {
  const { data, isLoading, error, mutate } = useSWR<MeResponse>("/api/app/me");

  return { credits: data?.user.credits, isLoading, error, mutate };
};

export default useCredits;
