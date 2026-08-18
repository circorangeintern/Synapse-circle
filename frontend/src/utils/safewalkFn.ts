
import type { LoginCredentials } from "@/components/auth/login";
import { getToken } from "@/lib/authStorage";
import {alertHistorySchema, loginAuthResponseSchema, profileResponseSchema, signupAuthResponseSchema, type AlertResponse, type ContactDTO, type LoginResponse, type ProfileResponse, type signupDTO, type SignupResponse } from "@/types";

const URL = import.meta.env.VITE_BACKEND_URL || "https://synap-circle.onrender.com/api"


export const signupUser = async (data: signupDTO): Promise<SignupResponse> => {
     const {name, email, password, phoneNumber} = data;

    const res = await fetch(`${URL}/auth/signup`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",

        },
        body: JSON.stringify({name, email, phoneNumber, password})
    })

    

    const rawJson = await res.json()

    const result = signupAuthResponseSchema.parse(rawJson);

    if(!result.success) {
        throw new Error(rawJson.message || "Invalid server response");
    }

    return result
 
}

export const verifyOTP = async ({otp, email}:{otp: string; email: string;}): Promise<LoginResponse> => {

    const localToken = getToken()

    const token = localToken?.token

    if(!token) {
        throw new Error("Something went wrong");
    }

    const res = await fetch(`${URL}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`

      }, body: JSON.stringify({
        email,
        otpCode: otp
      })
    })

    const rawJson = await res.json();


    const result = loginAuthResponseSchema.parse(rawJson)


    if(!result.success) {
        throw new Error(rawJson.message || "Invalid OTP token")
    }

    return result

}

export const resendOTP = async(email: string) => {

    const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }

    
    const data = await fetch(`${URL}/auth/resend-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${token}`

      }, body: JSON.stringify({ email })
    })

    const res = await data.json()

    return res


}

export const login = async (user: LoginCredentials): Promise<LoginResponse> => {

    const {email, password} = user;

    if(!email.trim() || !password.trim()) {
        throw new Error("email or password cannot be empty")
    }

    const res = await fetch(`${URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({email, password})
    })

    const rawJson = await res.json();
    

    const result = loginAuthResponseSchema.parse(rawJson)

    return result


}

export const onboardingRegistration = async(onboardingInfo: {
    step?: string;
        data: {
        location?: {latitude: number; longitude: number}
        name?: string
        acronym?: string
        contacts?: ContactDTO[]
    }}
 ) => {

    const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }


        const reqData = {
        step: onboardingInfo.step,
        data: onboardingInfo.data
    }

    
    const res = await fetch(`${URL}/auth/onboarding-step`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(reqData)
    })

    const rawJson = await res.json();

    return rawJson

}


export const loginWithGoogle = async (credential: string) => {
    
    const res = await fetch(`${URL}/auth/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({idToken: credential})
    })

    const rawJson = await res.json();


    return rawJson

}

export const triggerSOS = async (sosData: {latitude: number, longitude: number, locationAvailable: boolean}) => {

     const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }


  const res = await fetch(`${URL}/sos/trigger`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${token}`

        },
        body: JSON.stringify(sosData)
    })


    const rawJson = await res.json();

    return rawJson

}

export const alertHistory = async (): Promise<AlertResponse> => {

      const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }


  const res = await fetch(`${URL}/sos/history`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${token}`

        }
    })


    const rawJson = await res.json();

    const result = alertHistorySchema.parse(rawJson)


    return result
}



export const alertDetail = async ( id: string) => {

      const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }


  const res = await fetch(`${URL}/sos/history/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${token}`

        }
    })


    const rawJson = await res.json();

    return rawJson
}


export const cancelAlert = async ( {id, reason}: {id: string, reason: string}) => {

      const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }
    console.log("[ALERT REASON]", reason)
    console.log("[ALERT ID]", id)

  const res = await fetch(`${URL}/sos/cancel/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${token}`
        },
        body: JSON.stringify({reason})
    })


    const rawJson = await res.json();

    console.log(rawJson)

    return rawJson



}


export const userProfile = async (): Promise<ProfileResponse> => {

      const localToken = getToken()

    const token = localToken?.token

     if(!token) {
        throw new Error("Something went wrong");
    }


  const res = await fetch(`${URL}/profile/me`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${token}`

        }
    })


    const rawJson = await res.json();

    const result = profileResponseSchema.parse(rawJson)


    return result

}




export const logout = async({refreshToken}: {refreshToken: string}) => {
   
    if(!refreshToken) {
        throw new Error("Something went wrong");

    }


  const res = await fetch(`${URL}/auth/logout`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
             "Authorization": `${refreshToken}`

        },
        body: JSON.stringify({refreshToken})
    })


    const rawJson = await res.json();

    return rawJson

    
}
