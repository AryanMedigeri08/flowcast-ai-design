import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

const products = [
  { id: "1", name: "Organic Oat Milk", category: "Dairy Alt." },
  { id: "2", name: "Protein Bars (Variety)", category: "Snacks" },
  { id: "3", name: "Greek Yogurt 500g", category: "Dairy" },
  { id: "4", name: "Sparkling Water 12pk", category: "Beverages" },
  { id: "5", name: "Almond Butter 340g", category: "Spreads" },
  { id: "6", name: "Cold Brew Coffee 1L", category: "Beverages" },
];

const ProductSelector = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct = products.find((p) => p.id === selected) || products[0];
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 hover:bg-card/80 transition-all min-w-[240px]"
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div className="text-left flex-1">
          <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
          <p className="text-xs text-muted-foreground">{selectedProduct.category}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-72 glass-strong rounded-xl overflow-hidden z-50 shadow-xl shadow-background/50">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 ${
                  selected === product.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary/50 text-foreground"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${selected === product.id ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
