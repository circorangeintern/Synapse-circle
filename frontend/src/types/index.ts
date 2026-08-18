import {z} from "zod"

export const signupSchema = z.object({
    name: z.string(),
    email: z.email(),
    phoneNumber: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
    terms: z.boolean()

})

export const userSchema = z.object({
    id: z.string().optional(),
    phoneNumber: z.string(),
    email: z.email(),
    name: z.string(),
    isVerified: z.boolean(),
    trustedContact: z.array(z.object({
        name:z.string(),
        realtionship: z.string(),
        email: z.email(),
        phoneNumber: z.string()
    })),
    maxContacts: z.number()
    
})

export const verifyOtpDTO = z.object({
    email: z.email(),
    otpCode: z.string().min(6).max(6)
})

export const resendOtpDto = z.object({
    email: z.email()
})

export const resetPasswordDTO = z.object({
    resetToken: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string()
})


export const changePasswordDTO = z.object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confrimPassword: z.string()
})

export const authResponse = z.object({
    success: z.boolean(),
    message: z.string()
})

export const errorSchema = z.object({
    success: false,
    message: z.string(),
    errors: z.array(z.string()).optional()
})

export const createContactSchema = z.object({
    id:z.string().optional(),
    name: z.string(),
    phoneNumber: z.string(),
    email: z.email(),
    relationship: z.string().nullable()
});



export const trustedContactSchema = z.object({
    id: z.string().optional(),
    contact: z.object(createContactSchema),
    isPrimary: z.boolean(),
    isActive: z.boolean()
})

export const contactSchema = z.object({
    contacts: z.array(trustedContactSchema),
    count: z.number().min(1),
    maxContacts: z.number().max(3),
    canAddMore: z.boolean()
})

export const campusSecuritySchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    phoneNumber: z.number(),
    email: z.email(),
    location: z.string(),
    isPrimary: z.boolean(),
    operatingHours: z.string(),
})


export const emergencyContactSchema = z.object({
    id: z.string().optional(),
    type: z.string(),
    name: z.string(),
    phoneNumber: z.string(),
    address: z.string(),
    isVerified: z.boolean(),
    description: z.string(),
    operationHours: z.string()
})

export const emergencyContactResponse = z.object({
    success: z.boolean(),
    total: z.number(),
    contacts: z.array(emergencyContactSchema),
})

export const triggerSOSDTO = z.object({
    latitude: z.number(),
    longitude: z.number(),
    available: z.boolean()
})

export const SOSAlertSchema = z.object({
    cancellationReason: z.string(),
    cancelledAt: z.string(),
    durationMs: z.number(),
    id: z.string().optional(),
    location: triggerSOSDTO,
    locationLabel: z.string().nullable(),
    locationLink: z.string(),
    message: z.string(),
    recipientStats: z.object({total: z.number(), delivered: z.number(), failed: z.number()}),
    recipients: z.array(z.object({
    name: z.string(),
    email: z.email(),
    relationship: z.string(),
    status: z.string()
    })),
    resolutionReason: z.string(),
    resolvedAt: z.string(),
    resolvedBy: z.string(),
    responseTimeline: z.array(z.object({
    event: z.string(),
    status: z.string(),
    timestamp: z.string()
    })),
    status: z.string(),
    timestamp: z.string(),
    universityName: z.string()
})

export const SOSSchema = z.object({
    id: z.string().optional(),
    alertId: z.string(),
    status: z.boolean(),
    contactsNotified: z.array(z.object({
        type: z.string(),
        name: z.string(),
        email: z.email(),
        delivered: z.boolean()
    })),
    deliveredCount: z.number(),
    totalCount: z.number(),
    message: z.string()
})

export const cancelSOSSchema = z.object({
    id: z.string().optional(),
    reason: z.string()
})

export const SOSStatusSchema = z.object({
    id: z.string().optional(),
    status: z.string(),
    canCancel: z.boolean(),
    cancellationTimeRemaining: z.number(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const alertHistorySchema = z.object({
    alerts: z.array(SOSAlertSchema),
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    success: z.boolean()
})

export const userResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    phoneNumber: z.string().optional(),
    name: z.string(),
    isVerified: z.boolean(),
    isActive: z.boolean().optional(),
    profilePicture: z.string().optional(),
    selectedUniversity: z.string().optional(),
    university: z.object({
        acronym: z.string().optional(),
        location: z.string().optional(),
        name: z.string().optional()
    }).optional(),
    onboardingStep: z.string(),
    authProvider: z.string(),
    trustedContactsCount: z.number().optional(),
    maxContacts: z.number().optional(),
    preferences: z.object({
        autoShareLocation: z.boolean(),
        alertSound: z.boolean()
    }).optional(),
    createdAt: z.string().optional(),
    lastLogin: z.string().optional(),
    accessToken: z.string().optional(),
    refereshToken: z.string().optional(),
})

export const profileResponseSchema = z.object({
    profile: z.object({
    createdAt: z.string(),
    email: z.string(),
    id: z.string(),
    isActive: z.boolean(),
    isVerified: z.boolean(),
    lastLogin: z.string(),
    maxContacts: z.number(),
    name: z.string(),
    onboardingStep: z.enum(["welcome", "location", "contacts", "university"]),
    preferences: z.object({autoShareLocation: z.boolean(), alertSound: z.boolean(), onboardingLocation: z.object().nullable()}),
    profilePicture: z.string().nullable(),
    safetySetup: z.object({
            institutionSelected: z.boolean(),
            trustedContactsAdded: z.boolean(),
            locationPermissionEnabled: z.boolean(),
            isComplete: z.boolean()
        }),
    stats: z.object({total: z.number(), active: z.number(), cancelled: z.number(), resolved: z.number()}),
    trustedContacts: z.array(createContactSchema),
    university: z.string(),
    universityAcronym: z.string().nullable()
    }),
    success: z.boolean(),
       message: z.string().optional(),
    code: z.string().optional()


})

export const createAuthResponseSchema = <T extends z.ZodType>(dataSchema: T) => {
    return z.object({
        success: z.boolean(),
        message: z.string().optional(),
        development_otp: z.string().optional(),
        user: userResponseSchema.optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        isVerified: z.boolean().optional(),
        data: dataSchema.optional(),
        errors: z.array(z.string()).optional()

    })
}

export const signupAuthResponseSchema = createAuthResponseSchema(signupSchema)
export const loginAuthResponseSchema = createAuthResponseSchema(userResponseSchema);
export const alertResponseSchema = createAuthResponseSchema(alertHistorySchema)

export type signupDTO = z.infer<typeof signupSchema>
export type ErrorResponse = z.infer<typeof errorSchema>
export type SignupResponse = z.infer<typeof signupAuthResponseSchema>
export type LoginResponse = z.infer<typeof loginAuthResponseSchema>
export type ContactDTO = z.infer<typeof createContactSchema>
export type AlertResponse = z.infer<typeof alertHistorySchema> 
export type ProfileResponse = z.infer<typeof profileResponseSchema>

export type AlertSchema = z.infer<typeof SOSAlertSchema>
export type userResponse = z.infer<typeof userSchema>

export interface loginCredentials {
    email: string;
    password: string
}

export interface AuthState {
    email: string | null,
    token: string | null;
    isVerified: boolean | null;
    signup: (token: string, email: string, isVerified: boolean) => void;
    login: (token: string, isVerified: boolean) => void;
    logout: () => void;
}

