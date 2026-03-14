"use client"

import React, { useState, Children, useRef, useLayoutEffect, HTMLAttributes, ReactNode } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    initialStep?: number
    currentStep?: number // New prop for external control
    onStepChange?: (step: number) => void
    onFinalStepCompleted?: () => void
    // ... rest of props
    stepCircleContainerClassName?: string
    stepContainerClassName?: string
    contentClassName?: string
    footerClassName?: string
    backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
    nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
    backButtonText?: string
    nextButtonText?: string
    finalButtonText?: string
    disableStepIndicators?: boolean
    showStepLabels?: boolean
    stepLabels?: string[]
    isNextDisabled?: boolean
    renderStepIndicator?: (props: {
        step: number
        currentStep: number
        onStepClick: (clicked: number) => void
    }) => ReactNode
}

export default function Stepper({
    children,
    initialStep = 1,
    currentStep: controlledStep,
    onStepChange = () => { },
    onFinalStepCompleted = () => { },
    stepCircleContainerClassName,
    stepContainerClassName,
    contentClassName,
    footerClassName,
    backButtonProps,
    nextButtonProps,
    backButtonText = "Back",
    nextButtonText = "Next",
    finalButtonText = "Complete",
    disableStepIndicators = false,
    showStepLabels = false,
    stepLabels = [],
    isNextDisabled = false,
    renderStepIndicator,
    ...rest
}: StepperProps) {
    const [internalStep, setInternalStep] = useState<number>(initialStep)
    const currentStep = controlledStep !== undefined ? controlledStep : internalStep
    
    const [direction, setDirection] = useState<number>(0)
    const prevStepRef = useRef<number>(currentStep)

    useLayoutEffect(() => {
        if (controlledStep !== undefined && controlledStep !== prevStepRef.current) {
            setDirection(controlledStep > prevStepRef.current ? 1 : -1)
            prevStepRef.current = controlledStep
        }
    }, [controlledStep])

    const stepsArray = Children.toArray(children)
    const totalSteps = stepsArray.length
    const isCompleted = currentStep > totalSteps
    const isLastStep = currentStep === totalSteps

    const updateStep = (newStep: number) => {
        if (controlledStep === undefined) {
            setInternalStep(newStep)
        }
        
        if (newStep > totalSteps) {
            onFinalStepCompleted()
        } else {
            onStepChange(newStep)
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1)
            updateStep(currentStep - 1)
        }
    }

    const handleNext = () => {
        if (!isLastStep) {
            setDirection(1)
            updateStep(currentStep + 1)
        }
    }

    const handleComplete = () => {
        setDirection(1)
        updateStep(totalSteps + 1)
    }

    return (
        <div
            className={cn("flex min-h-full flex-1 flex-col items-center justify-center w-full", rest.className)}
            {...rest}
        >
            <div
                className={cn(
                    "mx-auto w-full max-w-3xl rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md md:backdrop-blur-2xl shadow-md md:shadow-2xl",
                    stepCircleContainerClassName
                )}
            >
                {/* Step indicators */}
                <StepIndicatorWrapper>
                    <div className={cn("flex w-full items-center px-6 py-8 md:px-16 md:py-10", stepContainerClassName)}>
                        {stepsArray.map((_, index) => {
                            const stepNumber = index + 1
                            const isNotLastStep = index < totalSteps - 1
                            return (
                                <React.Fragment key={stepNumber}>
                                    {renderStepIndicator ? (
                                        renderStepIndicator({
                                            step: stepNumber,
                                            currentStep,
                                            onStepClick: clicked => {
                                                setDirection(clicked > currentStep ? 1 : -1)
                                                updateStep(clicked)
                                            }
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <StepIndicator
                                                step={stepNumber}
                                                disableStepIndicators={disableStepIndicators}
                                                currentStep={currentStep}
                                                onClickStep={clicked => {
                                                    setDirection(clicked > currentStep ? 1 : -1)
                                                    updateStep(clicked)
                                                }}
                                            />
                                            {showStepLabels && stepLabels[index] && (
                                                <span className={cn(
                                                    "text-[10px] font-medium mt-1.5 transition-colors text-center max-w-[60px] leading-tight",
                                                    currentStep >= stepNumber ? "text-primary" : "text-muted-foreground/60"
                                                )}>
                                                    {stepLabels[index]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </StepIndicatorWrapper>

                {/* Step content */}
                <StepContentWrapper
                    isCompleted={isCompleted}
                    currentStep={currentStep}
                    direction={direction}
                    className={cn("px-6 md:px-16", contentClassName)}
                >
                    {stepsArray[currentStep - 1]}
                </StepContentWrapper>

                {/* Footer with navigation buttons */}
                {!isCompleted && (
                    <div className={cn("px-6 pb-8 md:px-16 md:pb-12", footerClassName)}>
                        <div className={cn("mt-10 flex", currentStep !== 1 ? "justify-between" : "justify-end")}>
                            {currentStep !== 1 && (
                                <button
                                    onClick={handleBack}
                                    type="button"
                                    className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/20 transition-all duration-300"
                                    {...backButtonProps}
                                >
                                    {backButtonText}
                                </button>
                            )}
                            <button
                                onClick={isLastStep ? handleComplete : handleNext}
                                type="button"
                                disabled={isNextDisabled}
                                className={cn(
                                    "flex items-center justify-center rounded-xl py-3.5 px-8 font-bold tracking-tight transition-all duration-300 min-w-[140px]",
                                    isLastStep
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                                        : "bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-lg shadow-blue-500/25",
                                    isNextDisabled && "opacity-40 cursor-not-allowed"
                                )}
                                {...nextButtonProps}
                            >
                                {isLastStep ? finalButtonText : nextButtonText}
                                {!isLastStep && (
                                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

interface StepContentWrapperProps {
    isCompleted: boolean
    currentStep: number
    direction: number
    children: ReactNode
    className?: string
}

function StepContentWrapper({
    isCompleted,
    currentStep,
    direction,
    children,
    className = ''
}: StepContentWrapperProps) {
    const [parentHeight, setParentHeight] = useState<number>(0)

    return (
        <motion.div
            style={{ position: 'relative', overflow: 'hidden' }}
            animate={{ height: isCompleted ? 0 : parentHeight }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={className}
        >
            <AnimatePresence initial={false} mode="sync" custom={direction}>
                {!isCompleted && (
                    <SlideTransition key={currentStep} direction={direction} onHeightReady={h => setParentHeight(h)}>
                        {children}
                    </SlideTransition>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

interface SlideTransitionProps {
    children: ReactNode
    direction: number
    onHeightReady: (height: number) => void
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useLayoutEffect(() => {
        if (containerRef.current) {
            onHeightReady(containerRef.current.offsetHeight)
        }
    }, [children, onHeightReady])

    return (
        <motion.div
            ref={containerRef}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        >
            {children}
        </motion.div>
    )
}

const stepVariants: Variants = {
    enter: (dir: number) => ({
        x: dir > 0 ? '100%' : '-100%',
        opacity: 0
    }),
    center: {
        x: '0%',
        opacity: 1
    },
    exit: (dir: number) => ({
        x: dir > 0 ? '-50%' : '50%',
        opacity: 0
    })
}

interface StepProps {
    children: ReactNode
    className?: string
}

export function Step({ children, className }: StepProps) {
    return <div className={cn("pb-4", className)}>{children}</div>
}

interface StepIndicatorProps {
    step: number
    currentStep: number
    onClickStep: (clicked: number) => void
    disableStepIndicators?: boolean
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators = false }: StepIndicatorProps) {
    const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete'

    const handleClick = () => {
        if (step !== currentStep && !disableStepIndicators) {
            onClickStep(step)
        }
    }

    return (
        <motion.div
            onClick={handleClick}
            className={cn(
                "relative outline-none focus:outline-none",
                !disableStepIndicators && "cursor-pointer"
            )}
            animate={status}
            initial={false}
        >
            <motion.div
                variants={{
                    inactive: {
                        scale: 1,
                        backgroundColor: 'var(--step-inactive-bg, rgba(0,0,0,0.05))',
                        borderColor: 'var(--step-inactive-border, rgba(0,0,0,0.1))',
                        color: 'var(--step-inactive-text, #666)'
                    },
                    active: {
                        scale: 1.1,
                        backgroundColor: 'var(--primary)',
                        borderColor: 'var(--primary)',
                        color: 'var(--primary-foreground)'
                    },
                    complete: {
                        scale: 1,
                        backgroundColor: 'var(--primary)',
                        borderColor: 'var(--primary)',
                        color: 'var(--primary-foreground)'
                    }
                }}
                transition={{ duration: 0.3 }}
                className="flex h-10 w-10 items-center justify-center rounded-full font-bold border-2 shadow-lg"
            >
                {status === 'complete' ? (
                    <CheckIcon className="h-5 w-5 text-primary-foreground" />
                ) : status === 'active' ? (
                    <span className="text-primary-foreground text-sm">{step}</span>
                ) : (
                    <span className="text-muted-foreground text-sm">{step}</span>
                )}
            </motion.div>
        </motion.div>
    )
}

function StepIndicatorWrapper({ children }: { children: ReactNode }) {
    return (
        <div className="contents" style={{
            '--step-inactive-bg': 'var(--muted)',
            '--step-inactive-border': 'var(--border)',
            '--step-inactive-text': 'var(--muted-foreground)'
        } as React.CSSProperties}>
            {children}
        </div>
    )
}

interface StepConnectorProps {
    isComplete: boolean
}

function StepConnector({ isComplete }: StepConnectorProps) {
    const lineVariants: Variants = {
        incomplete: { width: 0, backgroundColor: 'transparent' },
        complete: { width: '100%', backgroundColor: 'var(--primary)' }
    }

    return (
        <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                variants={lineVariants}
                initial={false}
                animate={isComplete ? 'complete' : 'incomplete'}
                transition={{ duration: 0.4 }}
            />
        </div>
    )
}

interface CheckIconProps extends React.SVGProps<SVGSVGElement> { }

function CheckIcon(props: CheckIconProps) {
    return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                    delay: 0.1,
                    type: 'tween',
                    ease: 'easeOut',
                    duration: 0.3
                }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
            />
        </svg>
    )
}
