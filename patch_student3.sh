cat << 'INNER_EOF' > fix.txt
              </button>
            </div>
          </div>
        </div>
INNER_EOF
sed -i 's/<\/button>$/'"$(cat fix.txt | sed 's/$/\\/')"'/g' src/pages/StudentPortalPage.tsx
