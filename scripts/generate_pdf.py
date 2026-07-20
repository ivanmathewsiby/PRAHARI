"""
Generate a simple fraud-intelligence brief PDF from a ring evidence package.
"""
import argparse
import textwrap

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
except ImportError:
    A4 = None
    canvas = None


def write_line(c, text, x, y, size=10):
    c.setFont("Helvetica", size)
    c.drawString(x, y, text)
    return y - 14


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ring-id", default="RING-demo")
    parser.add_argument("--output", default="fraud_intelligence_brief.pdf")
    args = parser.parse_args()

    if canvas is None:
        fallback = args.output.rsplit(".", 1)[0] + ".txt"
        with open(fallback, "w", encoding="utf-8") as handle:
            handle.write(
                "PRAHARI Fraud Intelligence Brief\n"
                f"Ring: {args.ring_id}\n"
                "For law-enforcement review - not a legal determination.\n"
                "Install reportlab to render the PDF version.\n"
            )
        print(f"reportlab is not installed; wrote {fallback}")
        return

    c = canvas.Canvas(args.output, pagesize=A4)
    width, height = A4
    y = height - 56
    c.setFont("Helvetica-Bold", 16)
    c.drawString(48, y, "PRAHARI Fraud Intelligence Brief")
    y -= 28
    y = write_line(c, f"Ring: {args.ring_id}", 48, y, 11)
    y = write_line(c, "For law-enforcement review - not a legal determination.", 48, y, 10)
    y -= 10
    body = (
        "This generated brief summarizes suspected shared fraud infrastructure, "
        "linked reports, identifiers, and evidence spans. It requires human "
        "verification before any enforcement action."
    )
    for line in textwrap.wrap(body, width=82):
        y = write_line(c, line, 48, y)
    y -= 10
    for section in ["Summary", "Linked Identifiers", "Evidence Spans", "Review Notes"]:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(48, y, section)
        y -= 18
        y = write_line(c, "Populate this section from GET /api/rings/{ring_id}/evidence-package.", 64, y)
        y -= 8
    c.showPage()
    c.save()
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
