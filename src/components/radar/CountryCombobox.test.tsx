import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CountryCombobox } from "./AddTeamDialog";
import { countryByName } from "@/data/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { elsaRegions } from "@/data/elsaUsageLocations";

function Harness() {
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState<string>("Europe");
  return (
    <div>
      <CountryCombobox
        value={country}
        onChange={(name) => {
          setCountry(name);
          const c = countryByName(name);
          if (c) setRegion(c.region);
        }}
      />
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger aria-label="Region">
          <SelectValue placeholder="Pick a region" />
        </SelectTrigger>
        <SelectContent>
          {elsaRegions.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

describe("CountryCombobox", () => {
  it("selects a country, fills region, and does not leave the region dropdown open", async () => {
    render(<Harness />);

    const comboboxes = screen.getAllByRole("combobox");
    const trigger = comboboxes[0]; // country trigger
    const regionTrigger = comboboxes[1];

    // Initial state
    expect(trigger).toHaveTextContent(/search country/i);

    // Open country popover
    fireEvent.click(trigger);

    // Filter the list
    const input = await screen.findByPlaceholderText(/search country/i);
    fireEvent.change(input, { target: { value: "Netherl" } });

    const option = await screen.findByRole("option", { name: /netherlands/i });

    // Use mousedown — matches real interaction handled by the component
    fireEvent.mouseDown(option);

    // Country trigger reflects selection
    expect(trigger).toHaveTextContent("Netherlands");

    // Country popover is closed (no search input remains in the DOM)
    expect(screen.queryByPlaceholderText(/search country/i)).not.toBeInTheDocument();

    // Region was auto-derived to "Europe" and is shown on the region trigger
    expect(regionTrigger).toHaveTextContent("Europe");

    // Region listbox is NOT open (regression guard for the prior cmdk/popover bug)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onChange with the properly-cased country name", () => {
    const onChange = vi.fn();
    render(<CountryCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox"));
    const input = screen.getByPlaceholderText(/search country/i);
    fireEvent.change(input, { target: { value: "Netherlands" } });

    const option = screen.getByRole("option", { name: /netherlands/i });
    fireEvent.mouseDown(option);

    expect(onChange).toHaveBeenCalledWith("Netherlands");
    expect(onChange).not.toHaveBeenCalledWith("netherlands");
  });
});
