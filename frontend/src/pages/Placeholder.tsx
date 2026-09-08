import { Construction } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <Header title={title} description={description} />
      <div className="flex-1 p-8">
        <Card className="max-w-2xl mx-auto mt-12">
          <CardContent className="p-12 text-center">
            <div className="size-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
              <Construction className="size-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Módulo en construcción
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              Esta sección estará disponible en los próximos pasos del desarrollo.
              La navegación, los permisos y la base de datos ya están funcionando.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}