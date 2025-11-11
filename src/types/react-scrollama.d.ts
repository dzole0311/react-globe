declare module "react-scrollama" {
  import * as React from "react";

  export interface StepEnterEvent<T = any> {
    data: T;
    direction: "up" | "down";
    entry: IntersectionObserverEntry;
    index: number;
  }

  export interface ScrollamaProps<T = any> {
    onStepEnter?: (e: StepEnterEvent<T>) => void;
    onStepExit?: (e: StepEnterEvent<T>) => void;
    offset?: number;
    children: React.ReactNode;
  }

  export const Scrollama: React.FC<ScrollamaProps<any>>;

  export interface StepProps<T = any> {
    data?: T;
    children: React.ReactNode;
  }

  export const Step: React.FC<StepProps<any>>;
}
