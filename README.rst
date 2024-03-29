RST AutoFormatter Action
########################

A GitHub Action that automatically formats reStructuredText (rst) files
in your project using ``rstfmt`` every time you make a push or a pull
request. This is done with a bit of complicated shell madness, and
Python.

*******
 Usage
*******

**Check if "Read and write permissions" are enabled in Settings ->
Actions -> General -> Workflow permissions:**

.. image:: media/chrome_pAkjeMG4hV.png

To use this action, you need to create a workflow (``.yml`` or ``.yaml``
file) in the ``.github/workflows`` directory of your repository. Please
make sure to modify the list of files under the ``matrix`` section of
your workflow to match your specific requirements. You can include
wildcards (``*``) to process multiple files in a directory such as
``tests/*.rst``, or you can simply use a specific file path like
``README.rst``. Here's what your workflow should look like:

.. code:: yaml

   name: Format RST files

   on:
     push:
       branches:
         - main

   jobs:
     format:
       runs-on: ubuntu-latest

       strategy:
         matrix:
           files:
             - tests/*.rst
             - README.rst
       steps:
         - name: Check out code
           uses: actions/checkout@v3

         - name: Set up Python
           uses: actions/setup-python@v4
           with:
             python-version: '3.10'

         - name: Install dependencies
           run: |
             python -m pip install --upgrade pip
             pip install -r requirements.txt

         - name: Format RST files
           run: |
             for file in ${{ matrix.files }}; do
               rstfmt "$file"
             done

         - name: Create temporary files
           run: |
             for file in ${{ matrix.files }}; do
               if [[ "$file" == */* ]]; then
                 dir=$(dirname "$file")
                 filename=$(basename "$file")
                 temp_file="$dir/temp-$filename"
               else
                 temp_file="temp-$file"
               fi
               cp "$file" "$temp_file"
             done

         - name: Compare files
           id: compare_files
           run: |
             for file in ${{ matrix.files }}; do
               if cmp -s "$file" "temp-$file"; then
                 echo "skip_$file=true" >> $GITHUB_ENV
               else
                 echo "skip_$file=false" >> $GITHUB_ENV
               fi
             done

         - name: Skip if files are identical
           run: |
             for file in ${{ matrix.files }}; do
               skip_value=$"{{ env['skip_' + file] }}"
               if [[ "$skip_value" == "true" ]]; then
                 echo "Skipping further steps for $file."
               else
                 echo "Continuing with further steps for $file."
               fi
             done

         - name: Replace files with formatted versions
           run: |
             for file in ${{ matrix.files }}; do
               skip_value=$"{{ env['skip_' + file] }}"
               if [[ "$skip_value" == "false" ]]; then
                 mv "temp-$file" "$file"
               fi
             done

         - name: Remove temporary files
           run: |
             for file in ${{ matrix.files }}; do
               if [[ "$file" == */* ]]; then
                 dir=$(dirname "$file")
                 filename=$(basename "$file")
                 temp_file="$dir/temp-$filename"
               else
                 temp_file="temp-$file"
               fi
               rm -f "$temp_file"
             done

         - name: Commit and push changes
           run: |
             git config user.name "GitHub Actions"
             git config user.email "<>"
             if [[ -n $(git status -s) ]]; then
               git add .
               git commit -m "Apply rstfmt formatting"
               git push
             else
               echo "No changes to commit. Skipping commit and push."
             fi

**************
 Dependencies
**************

This action uses the following tools:

-  ``rstfmt`` : A reStructuredText formatter - made in Python.

To install the dependencies, add ``rstfmt`` to a ``requirements.txt``
file at the top of your directory:

.. code:: plaintext

   rstfmt

*********
 License
*********

``rst-autoformatter-action`` is licensed under ``MIT``. See the `LICENSE
</LICENSE>`_ file for more information.
