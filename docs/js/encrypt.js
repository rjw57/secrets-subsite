import * as openpgp from "../vendor/openpgp/openpgp.min.mjs";

export const initialise = async () => {
  // Fetch and read public keyring.
  const pubKeyResponse = await fetch("../downloads/rich-wareham-public-keyring.gpg");
  if(!pubKeyResponse.ok) {
    throw new Error("Error reading public keys.");
  }
  const keys = await openpgp.readKeys({
    binaryKeys: new Uint8Array(await pubKeyResponse.arrayBuffer())
  });

  // Populate key select box.
  const keySelect = document.getElementById("key-select");
  keySelect.setAttribute("size", `${keys.length}`);
  const optElements = keys.map(key => {
    const optElement = document.createElement("option");
    optElement.value = key.getKeyID().toHex();
    optElement.appendChild(document.createTextNode(key.getUserIDs().join(", ")));
    keySelect.add(optElement);
    optElement.selected = true;
    return optElement;
  });

  const contentsElement = document.getElementById("file-contents");
  const resultElement = document.getElementById("armoured-result");
  const copyConfirmElement = document.getElementById("copy-confirm");

  // Clear result and contents elements.
  resultElement.value = "";
  contentsElement.value = "";
  if(copyConfirmElement) {
    copyConfirmElement.classList.remove("copied");
  }

  // Update the result given the content.
  const updateResult = async () => {
    resultElement.value = "";

    const selectedKeyIDs = new Set(optElements
      .filter(({ selected }) => selected)
      .map(({ value }) => value));
    const encryptionKeys = keys.filter(
      key => selectedKeyIDs.has(key.getKeyID().toHex())
    );

    // Clear the result element, placeholder and copy confirmation.
    resultElement.value = "";
    resultElement.setAttribute("placeholder", "");
    if(copyConfirmElement) {
      copyConfirmElement.classList.remove("copied");
    }

    if(encryptionKeys.length === 0) {
      resultElement.setAttribute("placeholder", "Select at least one recipient.");
    } else if(contentsElement.value.length === 0) {
      resultElement.setAttribute("placeholder", "The encrypted secret will appear here.");
    } else {
      const message = await openpgp.createMessage({
        text: contentsElement.value,
      });
      const result = await openpgp.encrypt({
        message,
        encryptionKeys,
      });
      resultElement.value = result;
    }
  };

  // Add event listeners for changes to contents or key selection.
  contentsElement.addEventListener("input", updateResult);
  keySelect.addEventListener("change", updateResult);

  // Add event listeners to select all/select none
  document.getElementById("key-select-all").addEventListener("click", () => {
    optElements.forEach(opt => { opt.selected = true; });
    updateResult();
  });
  document.getElementById("key-select-none").addEventListener("click", () => {
    optElements.forEach(opt => { opt.selected = false; });
    updateResult();
  });

  // Add event listeners for copy.
  document.getElementById("copy-result").addEventListener("click", async () => {
    await navigator.clipboard.writeText(resultElement.value);
    if(copyConfirmElement) {
      copyConfirmElement.classList.add("copied");
    }
  });

  // Perform an initial update.
  updateResult();
};

export default initialise;
