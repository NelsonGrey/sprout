import { forwardRef } from 'react';
import { Button, type ButtonProps } from './button';

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, ...props }, ref) => <Button ref={ref} size="icon" aria-label={label} {...props} />,
);
IconButton.displayName = 'IconButton';
