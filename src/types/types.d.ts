declare module 'next/navigation' {
  export function useParams(): Record<string, string | string[]>;
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    back: () => void;
  };
}

declare module '@/components/ui/card' {
  export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
}

declare module '@/components/ui/avatar' {
  export const Avatar: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const AvatarImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>>;
}

declare module '@/components/ui/button' {
  export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/badge' {
  export const Badge: React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: string }>;
}

declare module '@/components/ui/skeleton' {
  export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/icons' {
  export const Icons: {
    spinner: React.FC<React.SVGProps<SVGSVGElement>>;
    user: React.FC<React.SVGProps<SVGSVGElement>>;
    edit: React.FC<React.SVGProps<SVGSVGElement>>;
    delete: React.FC<React.SVGProps<SVGSVGElement>>;
  };
} 