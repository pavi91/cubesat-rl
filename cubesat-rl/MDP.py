import pypandoc
import os

def markdown_to_docx(input_file, output_file):
    """
    Converts a Markdown file with LaTeX equations to a Word document.
    Requires 'pandoc' to be installed on the system.
    """
    # Check if the input file exists
    if not os.path.exists(input_file):
        print(f"Error: The file {input_file} was not found.")
        return

    try:
        # Convert using pypandoc
        # The 'tex_math_dollars' extension ensures that inline $math$ and 
        # block $$math$$ are perfectly translated into Word's native OMML format.
        print(f"Converting '{input_file}' to '{output_file}'...")
        
        pypandoc.convert_file(
            input_file,
            'docx',
            outputfile=output_file,
            extra_args=['--from=markdown+tex_math_dollars']
        )
        
        print("Conversion successful! The formulas are now native Word equations.")
        
    except Exception as e:
        print(f"An error occurred during conversion: {e}")
        print("Please ensure 'pandoc' is installed on your machine.")

if __name__ == "__main__":
    # Save your markdown text to a file named 'mdp_spec.md' in the same directory
    input_filename = "mdp_spec.md"
    output_filename = "MDP_Specification.docx"
    
    markdown_to_docx(input_filename, output_filename)
