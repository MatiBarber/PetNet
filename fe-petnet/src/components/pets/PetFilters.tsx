import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter } from "lucide-react";
import { petTypes, ageGroups } from "@/data/pets";

interface FilterState {
  types: string[];
  ages: string[];
  location: string;
}

interface PetFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

const PetFilters = ({ onFiltersChange }: PetFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    ages: [],
    location: ""
  });
  
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.types, type]
      : filters.types.filter(t => t !== type);
    updateFilters({ types: newTypes });
  };

  const handleAgeChange = (age: string, checked: boolean) => {
    const newAges = checked
      ? [...filters.ages, age] 
      : filters.ages.filter(a => a !== age);
    updateFilters({ ages: newAges });
  };

  const clearFilters = () => {
    const emptyFilters = { types: [], ages: [], location: "" };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.types.length > 0 || filters.ages.length > 0 || filters.location !== "";

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-6">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="w-full"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
              {filters.types.length + filters.ages.length + (filters.location ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <Card className={`lg:block ${isOpen ? 'block' : 'hidden'} p-6 h-fit sticky top-24`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Location Filter */}
        <div className="space-y-4 mb-6">
          <Label htmlFor="location" className="text-sm font-medium">
            Ubicación
          </Label>
          <Input
            id="location"
            placeholder="Ciudad, provincia..."
            value={filters.location}
            onChange={(e) => updateFilters({ location: e.target.value })}
          />
        </div>

        {/* Type Filter */}
        <div className="space-y-4 mb-6">
          <Label className="text-sm font-medium">Tipo de Mascota</Label>
          <div className="space-y-3">
            {petTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.types.includes(type)}
                  onCheckedChange={(checked) => 
                    handleTypeChange(type, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`type-${type}`}
                  className="text-sm cursor-pointer"
                >
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Age Filter */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Edad</Label>
          <div className="space-y-3">
            {ageGroups.map((age) => (
              <div key={age} className="flex items-center space-x-2">
                <Checkbox
                  id={`age-${age}`}
                  checked={filters.ages.includes(age)}
                  onCheckedChange={(checked) => 
                    handleAgeChange(age, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`age-${age}`}
                  className="text-sm cursor-pointer"
                >
                  {age}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Close Button */}
        <div className="lg:hidden mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Ver Resultados
          </Button>
        </div>
      </Card>
    </>
  );
};

export default PetFilters;